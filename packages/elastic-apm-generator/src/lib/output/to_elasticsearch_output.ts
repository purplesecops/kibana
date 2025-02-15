/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from 'lodash';
import { getObserverDefaults } from '../..';
import { Fields } from '../entity';

export function toElasticsearchOutput(events: Fields[], versionOverride?: string) {
  return events.map((event) => {
    const values = {
      ...event,
      ...getObserverDefaults(),
      '@timestamp': new Date(event['@timestamp']!).toISOString(),
      'timestamp.us': event['@timestamp']! * 1000,
      'ecs.version': '1.4',
      'service.node.name':
        event['service.node.name'] || event['container.id'] || event['host.name'],
    };

    const document = {};
    // eslint-disable-next-line guard-for-in
    for (const key in values) {
      const val = values[key as keyof typeof values];
      set(document, key, val);
    }
    return {
      _index: `apm-${versionOverride || values['observer.version']}-${values['processor.event']}`,
      _source: document,
    };
  });
}
