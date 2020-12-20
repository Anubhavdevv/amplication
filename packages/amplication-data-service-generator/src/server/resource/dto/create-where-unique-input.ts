import { builders, namedTypes } from "ast-types";
import { Entity, EntityField, EnumDataType } from "../../../types";
import { classDeclaration, NamedClassDeclaration } from "../../../util/ast";
import { createFieldClassProperty } from "./create-field-class-property";
import { INPUT_TYPE_ID } from "./nestjs-graphql.util";

export function createWhereUniqueInput(
  entity: Entity,
  entityIdToName: Record<string, string>
): NamedClassDeclaration {
  const uniqueFields = entity.fields.filter(isUniqueField);
  const properties = uniqueFields.map((field) =>
    createFieldClassProperty(field, false, true, true, entityIdToName)
  );
  return classDeclaration(
    createWhereUniqueInputID(entity.name),
    builders.classBody(properties),
    null,
    [builders.decorator(builders.callExpression(INPUT_TYPE_ID, []))]
  ) as NamedClassDeclaration;
}

export function createWhereUniqueInputID(
  entityName: string
): namedTypes.Identifier {
  return builders.identifier(`${entityName}WhereUniqueInput`);
}

export function isUniqueField(field: EntityField): boolean {
  return field.dataType === EnumDataType.Id;
}
