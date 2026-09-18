import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";

import type { AuthRequest } from "../common/auth/auth.types.js";
import { FamilyAccessGuard } from "../common/auth/family-access.guard.js";
import { FamilyRoles } from "../common/auth/family-roles.decorator.js";
import { SessionAuthGuard } from "../common/auth/session-auth.guard.js";
import { FamilySlugPipe } from "../common/pipes/family-slug.pipe.js";
// Runtime import is required for Nest's emitted DTO validation metadata.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SaveFamilyTreeDesignDto } from "./dto/save-family-tree-design.dto.js";
import { FamilyTreeService } from "./family-tree.service.js";
import type {
  FamilyTreeResponse,
  SaveFamilyTreeDesignResponse,
} from "./family-tree.types.js";

@Controller("families/:slug/tree")
@UseGuards(SessionAuthGuard, FamilyAccessGuard)
@FamilyRoles(UserRole.MEMBER_PLUS, UserRole.MEMBER)
export class FamilyTreeController {
  constructor(
    @Inject(FamilyTreeService)
    private readonly familyTreeService: FamilyTreeService,
  ) {}

  @Get()
  getTree(
    @Param("slug", FamilySlugPipe) _slug: string,
    @Req() request: AuthRequest,
  ): Promise<FamilyTreeResponse> {
    return this.familyTreeService.getTree(this.getFamilyId(request));
  }

  @Post("design")
  @FamilyRoles(UserRole.MEMBER_PLUS)
  saveDesign(
    @Param("slug", FamilySlugPipe) _slug: string,
    @Body() input: SaveFamilyTreeDesignDto,
    @Req() request: AuthRequest,
  ): Promise<SaveFamilyTreeDesignResponse> {
    return this.familyTreeService.saveDesign(this.getFamilyId(request), input);
  }

  private getFamilyId(request: AuthRequest): string {
    if (!request.familyAccess) {
      throw new UnauthorizedException(
        "Bạn cần đăng nhập để thực hiện thao tác này.",
      );
    }

    return request.familyAccess.familyId;
  }
}
