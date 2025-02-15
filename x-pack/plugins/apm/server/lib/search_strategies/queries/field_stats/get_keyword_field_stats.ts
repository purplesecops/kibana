/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';
import { estypes } from '@elastic/elasticsearch';
import { FieldValuePair } from '../../../../../common/search_strategies/types';
import { getQueryWithParams } from '../get_query_with_params';
import { buildSamplerAggregation } from '../../utils/field_stats_utils';
import {
  FieldStatsCommonRequestParams,
  KeywordFieldStats,
  Aggs,
  TopValueBucket,
} from '../../../../../common/search_strategies/field_stats_types';

export const getKeywordFieldStatsRequest = (
  params: FieldStatsCommonRequestParams,
  fieldName: string,
  termFilters?: FieldValuePair[]
): SearchRequest => {
  const query = getQueryWithParams({ params, termFilters });

  const { index, samplerShardSize } = params;

  const size = 0;
  const aggs: Aggs = {
    sampled_top: {
      terms: {
        field: fieldName,
        size: 10,
        order: {
          _count: 'desc',
        },
      },
    },
  };

  const searchBody = {
    query,
    aggs: {
      sample: buildSamplerAggregation(aggs, samplerShardSize),
    },
  };

  return {
    index,
    size,
    body: searchBody,
  };
};

export const fetchKeywordFieldStats = async (
  esClient: ElasticsearchClient,
  params: FieldStatsCommonRequestParams,
  field: FieldValuePair,
  termFilters?: FieldValuePair[]
): Promise<KeywordFieldStats> => {
  const request = getKeywordFieldStatsRequest(
    params,
    field.fieldName,
    termFilters
  );
  const { body } = await esClient.search(request);
  const aggregations = body.aggregations as {
    sample: {
      sampled_top: estypes.AggregationsTermsAggregate<TopValueBucket>;
    };
  };
  const topValues: TopValueBucket[] =
    aggregations?.sample.sampled_top?.buckets ?? [];

  const stats = {
    fieldName: field.fieldName,
    topValues,
    topValuesSampleSize: topValues.reduce(
      (acc, curr) => acc + curr.doc_count,
      aggregations.sample.sampled_top?.sum_other_doc_count ?? 0
    ),
  };

  return stats;
};
