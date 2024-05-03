import { recase } from '@kristiandupont/recase';
import { BaseSchema, getBaseSchema } from './getBaseSchema';
import { escapeString } from './escape/escapeString';
import { escapeIdentifier } from './escape/escapeIdentifier';
import { jsTypeForAirtableType } from './jsTypeForAirtableType';

export interface Config {
  apiKey: string,
  baseId: string,
  endpointUrl?: string,
  requestTimeout?: number,
  customHeaders?: Record<string, string | number | boolean>
}

// This will output a folder named `app1234` with:
// - an `index.ts` that exports all the tables
// - (under the hood?) various `tbl1234.ts` files that contain table definitions
export const main = async (config: Config) => {
  const baseSchema = await getBaseSchema(config.baseId, config);
  return `/* DO NOT EDIT: this file was automatically generated by airtable-ts-codegen */\n/* eslint-disable */\nimport { Item, Table } from 'airtable-ts';\n\n${baseSchema.map((tableSchema) => generateCode(config, tableSchema)).join('\n\n')}`;
};

const generateCode = (config: Config, tableSchema: BaseSchema[number]): string => {
  const itemNameRaw = escapeIdentifier(recase(null, 'pascal', tableSchema.name));
  const itemName = /.s$/.test(itemNameRaw) ? itemNameRaw.slice(0, itemNameRaw.length - 1) : itemNameRaw;
  const tableName = escapeIdentifier(`${recase(null, 'camel', tableSchema.name)}Table`);

  const fields = tableSchema.fields.map((f) => ({
    ...f,
    jsName: escapeIdentifier(recase(null, 'camel', escapeIdentifier(f.name))),
    jsType: jsTypeForAirtableType(f),
  }));

  return `export interface ${itemName} extends Item {
  id: string,${fields.map((f) => `\n  ${f.jsName}: ${f.jsType},`).join('')}
}

export const ${tableName}: Table<${itemName}> = {
  name: '${escapeString(tableSchema.name)}',
  baseId: '${escapeString(config.baseId)}',
  tableId: '${escapeString(tableSchema.id)}',
  mappings: {${fields.map((f) => `\n    ${f.jsName}: '${escapeString(f.id)}',`).join('')}
  },
  schema: {${fields.map((f) => `\n    ${f.jsName}: '${escapeString(f.jsType)}',`).join('')}
  },
};`;
};
