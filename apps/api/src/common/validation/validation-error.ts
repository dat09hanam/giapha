import { BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";

const FIELD_LABELS: Record<string, string> = {
  username: "tên đăng nhập",
  password: "mật khẩu",
  name: "tên",
  slug: "đường dẫn",
  deathAnniversary: "ngày giỗ họ",
  description: "giới thiệu",
  address: "địa chỉ",
  ancestryOrigin: "quê quán hoặc nguồn gốc",
  fatherId: "mã người cha",
  motherId: "mã người mẹ",
  nickname: "tên thường gọi",
  courtesyName: "tên tự",
  gender: "giới tính",
  birthDate: "ngày sinh",
  deathDate: "ngày mất",
  lunarDeathDay: "ngày mất âm lịch",
  lunarDeathMonth: "tháng mất âm lịch",
  isAlive: "trạng thái còn sống",
  burialPlace: "nơi an táng",
  phone: "số điện thoại",
  avatarUrl: "đường dẫn ảnh đại diện",
  biography: "tiểu sử",
  generation: "đời thứ",
  orderInFamily: "thứ tự trong gia đình",
  clientId: "mã khung thành viên",
  databaseId: "mã thành viên đã lưu",
  fatherClientId: "mã khung người cha",
  motherClientId: "mã khung người mẹ",
  husbandClientId: "mã khung người chồng",
  wifeClientId: "mã khung người vợ",
  wifeOrder: "thứ tự người vợ",
  birthYear: "năm sinh",
  deathYear: "năm mất",
  people: "danh sách thành viên",
  relationships: "danh sách quan hệ",
  deletedPersonIds: "danh sách thành viên cần xóa",
};

function fieldLabel(property: string): string {
  return FIELD_LABELS[property] ?? property;
}

function firstNumber(message: string): string | null {
  return /\d+/.exec(message)?.[0] ?? null;
}

function constraintMessage(
  property: string,
  constraint: string,
  originalMessage: string,
): string {
  const label = fieldLabel(property);
  const limit = firstNumber(originalMessage);

  switch (constraint) {
    case "isString":
      return `Trường ${label} phải là văn bản.`;
    case "isArray":
      return "Trường " + label + " phải là một danh sách.";
    case "arrayMinSize":
      return (
        "Trường " + label + " phải có ít nhất " + (limit ?? "một") + " mục."
      );
    case "arrayMaxSize":
      return "Trường " + label + " có quá nhiều mục.";
    case "nestedValidation":
      return "Một mục trong trường " + label + " không hợp lệ.";
    case "minLength":
      return limit
        ? `Trường ${label} phải có ít nhất ${limit} ký tự.`
        : `Trường ${label} quá ngắn.`;
    case "maxLength":
      return limit
        ? `Trường ${label} không được vượt quá ${limit} ký tự.`
        : `Trường ${label} quá dài.`;
    case "matches":
      if (property === "deathAnniversary") {
        return "Ngày giỗ họ phải có định dạng DD/MM.";
      }
      if (property === "slug") {
        return "Đường dẫn chỉ gồm chữ thường, số và dấu gạch ngang.";
      }
      if (property === "username") {
        return "Tên đăng nhập chỉ gồm chữ, số và các ký tự . _ @ -.";
      }
      return `Trường ${label} không đúng định dạng.`;
    case "isUuid":
      return `Trường ${label} phải là mã UUID hợp lệ.`;
    case "isEnum":
      return `Giá trị của trường ${label} không nằm trong danh sách cho phép.`;
    case "isDateString":
      return `Trường ${label} phải là ngày hợp lệ theo chuẩn ISO.`;
    case "isInt":
      return `Trường ${label} phải là số nguyên.`;
    case "min":
      return limit
        ? `Trường ${label} phải lớn hơn hoặc bằng ${limit}.`
        : `Trường ${label} nhỏ hơn giá trị cho phép.`;
    case "max":
      return limit
        ? `Trường ${label} phải nhỏ hơn hoặc bằng ${limit}.`
        : `Trường ${label} vượt quá giá trị cho phép.`;
    case "isBoolean":
      return `Trường ${label} phải là giá trị đúng hoặc sai.`;
    case "isUrl":
      return `Trường ${label} phải là URL bắt đầu bằng http:// hoặc https://.`;
    case "whitelistValidation":
      return `Trường ${label} không được hệ thống hỗ trợ.`;
    default:
      return `Trường ${label} không hợp lệ.`;
  }
}

function messagesForError(error: ValidationError): string[] {
  const nestedMessages = (error.children ?? []).flatMap(messagesForError);
  const constraints = Object.entries(error.constraints ?? {});

  if (
    constraints.length > 0 &&
    (error.value === undefined || error.value === null) &&
    !constraints.some(([constraint]) => constraint === "whitelistValidation")
  ) {
    return [
      `Trường ${fieldLabel(error.property)} là bắt buộc.`,
      ...nestedMessages,
    ];
  }

  return [
    ...constraints.map(([constraint, message]) =>
      constraintMessage(error.property, constraint, message),
    ),
    ...nestedMessages,
  ];
}

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  const messages = [...new Set(errors.flatMap(messagesForError))];
  return new BadRequestException(
    messages.length > 0 ? messages : ["Dữ liệu gửi lên không hợp lệ."],
  );
}
