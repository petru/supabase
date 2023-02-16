import dayjs from 'dayjs'
import { DatetimeHelper } from '../Settings/Logs'
import { PresetConfig, Presets, ReportFilterItem } from './Reports.types'

export const LAYOUT_COLUMN_COUNT = 24

export const REPORTS_DATEPICKER_HELPERS: DatetimeHelper[] = [
  {
    text: 'Last 24 hours',
    calcFrom: () => dayjs().subtract(1, 'day').startOf('day').toISOString(),
    calcTo: () => '',
    default: true,
  },
  {
    text: 'Last 7 days',
    calcFrom: () => dayjs().subtract(7, 'day').startOf('day').toISOString(),
    calcTo: () => '',
  },
  {
    text: 'Last 14 days',
    calcFrom: () => dayjs().subtract(7, 'day').startOf('day').toISOString(),
    calcTo: () => '',
  },
  {
    text: 'Last 30 days',
    calcFrom: () => dayjs().subtract(30, 'day').startOf('day').toISOString(),
    calcTo: () => '',
  },
]

export const DEFAULT_QUERY_PARAMS = {
  iso_timestamp_start: REPORTS_DATEPICKER_HELPERS[0].calcFrom(),
  iso_timestamp_end: REPORTS_DATEPICKER_HELPERS[0].calcTo(),
}

const generateRexepWhere = (filters: ReportFilterItem[], prepend = true) => {
  if (filters.length === 0) return ''
  const conditions = filters
    .map((filter) => {
      const splitKey = filter.key.split('.')
      const normalizedKey = [splitKey[splitKey.length - 2], splitKey[splitKey.length - 1]].join('.')
      if (filter.compare === 'matches') {
        return `REGEXP_CONTAINS(${normalizedKey}, '${filter.value}')`
      } else if (filter.compare === 'is') {
        return `${normalizedKey} = ${filter.value}`
      }
    })
    .join(' AND ')
  if (prepend) {
    return 'WHERE ' + conditions
  } else {
    return conditions
  }
}

export const PRESET_CONFIG: Record<Presets, PresetConfig> = {
  [Presets.API]: {
    title: 'API',
    queries: {
      totalRequests: {
        queryType: 'logs',
        sql: (filters) => `
        select
          cast(timestamp_trunc(t.timestamp, hour) as datetime) as timestamp,
          count(t.id) as count
        FROM edge_logs t
          cross join unnest(metadata) as m
          cross join unnest(m.response) as response
          cross join unnest(m.request) as request
          cross join unnest(request.headers) as headers
          ${generateRexepWhere(filters)}
        GROUP BY
          timestamp
        ORDER BY
          timestamp ASC`,
      },
      errorCounts: {
        queryType: 'logs',
        sql: (filters) => `
        select
          cast(timestamp_trunc(t.timestamp, hour) as datetime) as timestamp,
          count(t.id) as count
        FROM edge_logs t
          cross join unnest(metadata) as m
          cross join unnest(m.response) as response
          cross join unnest(m.request) as request
          cross join unnest(request.headers) as headers
        WHERE
          response.status_code >= 400
        ${generateRexepWhere(filters, false)}
        GROUP BY
          timestamp
        ORDER BY
          timestamp ASC
        `,
      },
      responseSpeed: {
        queryType: 'logs',
        sql: (filters) => `
        select
          cast(timestamp_trunc(t.timestamp, hour) as datetime) as timestamp,
          avg(response.origin_time) as avg,
          APPROX_QUANTILES(response.origin_time, 100) as quantiles
        FROM
          edge_logs t
          cross join unnest(metadata) as m
          cross join unnest(m.response) as response
          cross join unnest(m.request) as request
          cross join unnest(request.headers) as headers
          ${generateRexepWhere(filters)}
        GROUP BY
          timestamp
        ORDER BY
          timestamp ASC
      `,
      },
    },
  },
  [Presets.AUTH]: {
    title: '',
    queries: {},
  },
  [Presets.STORAGE]: {
    title: '',
    queries: {},
  },
}

export const DATETIME_FORMAT = 'MMM D, ha'
