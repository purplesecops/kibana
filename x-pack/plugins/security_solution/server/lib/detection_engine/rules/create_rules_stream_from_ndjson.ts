/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { createSplitStream, createMapStream, createConcatStream } from '@kbn/utils';

import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { importRuleValidateTypeDependents } from '../../../../common/detection_engine/schemas/request/import_rules_type_dependents';
import {
  importRulesSchema,
  ImportRulesSchema,
  ImportRulesSchemaDecoded,
} from '../../../../common/detection_engine/schemas/request/import_rules_schema';
import {
  parseNdjsonStrings,
  filterExportedRulesCounts,
  filterExceptions,
  createLimitStream,
} from '../../../utils/read_stream/create_stream_from_ndjson';

export const validateRules = (): Transform => {
  return createMapStream((obj: ImportRulesSchema) => {
    if (!(obj instanceof Error)) {
      const decoded = importRulesSchema.decode(obj);
      const checked = exactCheck(obj, decoded);
      const onLeft = (errors: t.Errors): BadRequestError | ImportRulesSchemaDecoded => {
        return new BadRequestError(formatErrors(errors).join());
      };
      const onRight = (schema: ImportRulesSchema): BadRequestError | ImportRulesSchemaDecoded => {
        const validationErrors = importRuleValidateTypeDependents(schema);
        if (validationErrors.length) {
          return new BadRequestError(validationErrors.join());
        } else {
          return schema as ImportRulesSchemaDecoded;
        }
      };
      return pipe(checked, fold(onLeft, onRight));
    } else {
      return obj;
    }
  });
};

// TODO: Capture both the line number and the rule_id if you have that information for the error message
// eventually and then pass it down so we can give error messages on the line number

/**
 * Inspiration and the pattern of code followed is from:
 * saved_objects/lib/create_saved_objects_stream_from_ndjson.ts
 */
export const createRulesStreamFromNdJson = (ruleLimit: number) => {
  return [
    createSplitStream('\n'),
    parseNdjsonStrings(),
    filterExportedRulesCounts(),
    filterExceptions(),
    validateRules(),
    createLimitStream(ruleLimit),
    createConcatStream([]),
  ];
};
