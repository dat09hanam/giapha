'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type RefObject,
} from 'react';
import {
  getViewportForBounds,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type CoordinateExtent,
  type NodeTypes,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Minimize2, Printer, RotateCw, UsersRound } from 'lucide-react';
import Link from 'next/link';

import { familyEdgeTypes } from '@/components/tree/family-link-edge';
import { KinshipDialog } from '@/components/tree/kinship-dialog';
import { PersonDetailsDialog } from '@/components/tree/person-details-dialog';
import { HighlightedPersonContext, PersonNode } from '@/components/tree/person-node';
import { PersonSearch } from '@/components/tree/person-search';
import { PosterFrame } from '@/components/tree/poster-nodes';
import { Presence } from '@/components/ui/presence';
import { useIsPortrait, useRotatedPanZoom } from '@/components/tree/rotated-pan-zoom';
import { buildKinshipGraph } from '@/lib/kinship';
import type { PersonSearchEntry } from '@/lib/person-search';
import { toPosterElements } from '@/lib/tree-layout';
import { cn } from '@/lib/utils';
import type { FamilyPoster } from '@/lib/poster-decorations';
import type { FamilyFeatures, FamilyTreeResponse } from '@/types/family-tree';

const nodeTypes = {
  person: PersonNode,
  posterFrame: PosterFrame,
} satisfies NodeTypes;

/** Zooms to a searched person with room around the card to see their parents and children. */
const FOCUS_PERSON_OPTIONS = { padding: 1.5, maxZoom: 1.2, duration: 700 };
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 2;

type Rect = { x: number; y: number; width: number; height: number };
type LandscapeMode = 'off' | 'on' | 'leaving';

/** The poster's starting view: the whole sheet, centred in the canvas. */
function viewportForPoster(poster: Rect, width: number, height: number): Viewport {
  return getViewportForBounds(poster, width, height, MIN_ZOOM, MAX_ZOOM, 0.01);
}

/**
 * Shows the poster once React Flow is ready and again whenever the canvas
 * width changes (resize, rotation, landscape view). Height-only changes, such
 * as a phone's address bar or keyboard, keep the viewer's place. Sizes come
 * from the element's layout box, which a CSS rotation leaves untouched.
 */
function useShowPoster(surface: RefObject<HTMLDivElement | null>, poster: Rect | null) {
  const { setViewport } = useReactFlow();
  const panZoomReady = useStore((state) => state.panZoom !== null);
  const [shown, setShown] = useState(false);

  const showPoster = useCallback(
    (duration?: number): boolean => {
      const element = surface.current;
      if (!element || !poster || !element.offsetWidth || !element.offsetHeight) return false;
      void setViewport(viewportForPoster(poster, element.offsetWidth, element.offsetHeight), {
        duration,
      });
      return true;
    },
    [poster, setViewport, surface],
  );

  useEffect(() => {
    const element = surface.current;
    if (!element || !panZoomReady) return;
    let shownAtWidth = 0;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth === shownAtWidth || !showPoster()) return;
      shownAtWidth = element.offsetWidth;
      setShown(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [panZoomReady, showPoster, surface]);

  return { showPoster, shown: shown || !poster };
}

type FamilyTreeProps = {
  tree: FamilyTreeResponse;
  family: { name: string; poster: FamilyPoster; features: FamilyFeatures };
  familySlug: string;
};

export function FamilyTree(props: FamilyTreeProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeView {...props} />
    </ReactFlowProvider>
  );
}

function FamilyTreeView({ tree, family, familySlug }: FamilyTreeProps) {
  const { fitView } = useReactFlow();
  const { nodes, edges } = useMemo(
    () => toPosterElements(tree, family, familySlug),
    [family, familySlug, tree],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const closeDetails = useCallback(() => setSelectedId(null), []);
  /** Open kinship dialog and the person it starts from; undefined while closed. */
  const [kinshipFromId, setKinshipFromId] = useState<string | null | undefined>(undefined);
  const closeKinship = useCallback(() => setKinshipFromId(undefined), []);
  const openKinshipFrom = useCallback((personId: string) => {
    setSelectedId(null);
    setKinshipFromId(personId);
  }, []);
  const kinshipGraph = useMemo(
    () => buildKinshipGraph(tree.people, tree.relationships),
    [tree.people, tree.relationships],
  );

  // Generations as the layout numbered them, so the popup matches the cards.
  const generations = useMemo(
    () =>
      new Map(
        nodes.flatMap((node) =>
          node.type === 'person' && 'generation' in node.data
            ? [[node.id, node.data.generation as number] as const]
            : [],
        ),
      ),
    [nodes],
  );
  const searchEntries = useMemo<PersonSearchEntry[]>(() => {
    const peopleById = new Map(tree.people.map((person) => [person.id, person]));
    return nodes.flatMap((node) => {
      const person = peopleById.get(node.id);
      if (node.type !== 'person' || !person) return [];
      return [
        {
          person,
          generation: node.data.generation,
          lifespan: node.data.lifespan,
          fatherName: person.fatherId ? (peopleById.get(person.fatherId)?.name ?? null) : null,
        },
      ];
    });
  }, [nodes, tree.people]);
  const selectedPerson = selectedId
    ? tree.people.find((person) => person.id === selectedId)
    : undefined;

  const poster = useMemo<Rect | null>(() => {
    const frame = nodes.find((node) => node.type === 'posterFrame');
    return frame ? { ...frame.position, width: frame.data.width, height: frame.data.height } : null;
  }, [nodes]);
  // Panning stops at the sheet's edges so nobody gets lost in the empty canvas.
  const translateExtent = useMemo<CoordinateExtent | undefined>(
    () =>
      poster
        ? [
            [poster.x, poster.y],
            [poster.x + poster.width, poster.y + poster.height],
          ]
        : undefined,
    [poster],
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { showPoster, shown } = useShowPoster(surfaceRef, poster);

  // "Xem ngang": the canvas fills the screen. On an upright phone it is also
  // turned 90° with CSS, since iOS lets no page lock the screen to landscape;
  // a phone that is physically turned just gets the full screen. "leaving"
  // plays the way back before the canvas returns to the page.
  const [landscapeMode, setLandscapeMode] = useState<LandscapeMode>('off');
  const landscape = landscapeMode !== 'off';
  const leaving = landscapeMode === 'leaving';
  const isPortrait = useIsPortrait();
  const turned = landscape && isPortrait;
  const rotatedGestures = useRotatedPanZoom(turned, poster);
  const exitLandscape = useCallback(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLandscapeMode(reducedMotion ? 'off' : 'leaving');
  }, []);
  const finishLeaving = useCallback((event: AnimationEvent<HTMLDivElement>) => {
    // Only the box's own animation; cards and dialogs inside animate too.
    if (event.target === event.currentTarget) {
      setLandscapeMode((mode) => (mode === 'leaving' ? 'off' : mode));
    }
  }, []);

  const focusPerson = useCallback(
    (personId: string) => {
      setHighlightedId(personId);
      void fitView({ ...FOCUS_PERSON_OPTIONS, nodes: [{ id: personId }] });
    },
    [fitView],
  );
  const clearFocus = useCallback(() => {
    setHighlightedId(null);
    showPoster(500);
  }, [showPoster]);

  if (nodes.length === 0) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-8 text-center">
        <p className="text-lg font-medium text-stone-700">Cây gia phả đang được thiết kế</p>
      </div>
    );
  }

  // From sm up the canvas is a 16:9 sheet as large as fits below the search
  // bar (h-10) and its gap (gap-3), 3.25rem.
  const layoutVars = {
    '--poster-width': 'min(100%, calc((100vh - 4rem - 2rem - 3.25rem) * 16 / 9))',
  } as CSSProperties;

  return (
    // On phones the canvas takes the whole screen between the search bar and the
    // bottom tab bar (4rem), the sheet fitted edge to edge; dvh follows the
    // collapsing address bar.
    <div
      className="box-border flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col items-center gap-2 bg-stone-900 sm:h-auto sm:min-h-[calc(100vh-4rem)] sm:justify-center sm:gap-3 sm:p-4"
      style={layoutVars}
    >
      <div className="flex w-full shrink-0 justify-center gap-2 px-3 pt-2 sm:max-w-[var(--poster-width)] sm:px-0 sm:pt-0">
        <PersonSearch entries={searchEntries} onSelect={focusPerson} onClear={clearFocus} />
        <button
          type="button"
          onClick={() => setKinshipFromId(null)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-stone-600 bg-stone-800 px-3 text-sm font-medium text-stone-100 hover:border-amber-400 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
        >
          <UsersRound className="size-4" aria-hidden="true" />
          Xưng hô
        </button>
        {family.features.printBook ? (
          <Link
            href={`/${encodeURIComponent(familySlug)}/in-gia-pha`}
            aria-label="In gia phả"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-stone-600 bg-stone-800 px-3 text-sm font-medium text-stone-100 hover:border-amber-400 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
          >
            <Printer className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">In gia phả</span>
          </Link>
        ) : null}
      </div>
      {landscape ? (
        <div
          aria-hidden="true"
          className={cn(
            'fixed inset-0 z-[60] bg-stone-950 motion-reduce:animate-none',
            leaving
              ? 'animate-[tree-fade-out_350ms_ease-in_forwards]'
              : 'animate-[tree-fade-in_350ms_ease-out]',
          )}
        />
      ) : null}
      {/* Dialogs live inside this box so that, turned sideways, they turn with the tree. */}
      <div
        className={cn(
          'overflow-hidden',
          turned
            ? // Centred and turned a quarter round, so it swings about the middle of the screen.
              'fixed left-1/2 top-1/2 z-[60] h-[100dvw] w-[100dvh] -translate-x-1/2 -translate-y-1/2 rotate-90 bg-stone-900'
            : landscape
              ? 'fixed inset-0 z-[60] bg-stone-900'
              : 'relative min-h-0 w-full flex-1 sm:aspect-video sm:w-[var(--poster-width)] sm:flex-none sm:rounded-lg sm:shadow-2xl',
          landscape &&
            (leaving
              ? turned
                ? 'animate-[tree-turn-out_350ms_ease-in_forwards]'
                : 'animate-[tree-fade-out_350ms_ease-in_forwards]'
              : turned
                ? 'animate-[tree-turn-in_350ms_ease-out]'
                : 'animate-[tree-fade-in_350ms_ease-out]'),
          'motion-reduce:animate-none',
        )}
        onAnimationEnd={finishLeaving}
        aria-label="Phả đồ cây gia phả"
      >
        <div
          ref={surfaceRef}
          className={cn(
            'size-full transition-opacity duration-300',
            shown ? 'opacity-100' : 'opacity-0',
            turned && 'touch-none',
          )}
          {...rotatedGestures}
        >
          <HighlightedPersonContext.Provider value={highlightedId}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={familyEdgeTypes}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              translateExtent={translateExtent}
              panOnDrag={!turned}
              zoomOnPinch={!turned}
              zoomOnDoubleClick={!turned}
              onNodeClick={(_, node) => {
                if (node.type === 'person') setSelectedId(node.id);
              }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
              style={{ background: '#2a1d0e' }}
            ></ReactFlow>
          </HighlightedPersonContext.Provider>
        </div>
        {landscape ? (
          <button
            type="button"
            onClick={exitLandscape}
            disabled={leaving}
            aria-label="Thoát xem ngang"
            className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-stone-900/80 text-white shadow-lg backdrop-blur hover:bg-stone-900"
          >
            <Minimize2 className="size-5" aria-hidden="true" />
          </button>
        ) : (
          // Only upright screens need it; landscape ones already show the sheet whole.
          <button
            type="button"
            onClick={() => setLandscapeMode('on')}
            aria-label="Xoay ngang gia phả"
            className="absolute right-3 top-3 z-10 hidden size-11 place-items-center rounded-full bg-stone-900/80 text-white shadow-lg backdrop-blur hover:bg-stone-900 portrait:grid"
          >
            <RotateCw className="size-5" aria-hidden="true" />
          </button>
        )}
        <Presence>
          {selectedPerson ? (
            <PersonDetailsDialog
              person={selectedPerson}
              generation={generations.get(selectedPerson.id) ?? selectedPerson.generation}
              people={tree.people}
              relationships={tree.relationships}
              familySlug={familySlug}
              canSuggestEdits={family.features.editSuggestions}
              onSelectPerson={setSelectedId}
              onFindKinship={openKinshipFrom}
              onClose={closeDetails}
            />
          ) : null}
        </Presence>
        <Presence>
          {kinshipFromId !== undefined ? (
            <KinshipDialog
              entries={searchEntries}
              graph={kinshipGraph}
              initialFromId={kinshipFromId}
              onClose={closeKinship}
            />
          ) : null}
        </Presence>
      </div>
    </div>
  );
}
