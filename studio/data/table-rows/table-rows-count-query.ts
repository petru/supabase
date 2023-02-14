import { QueryKey, UseQueryOptions } from '@tanstack/react-query'
import { Filter, Query, SupaRow, SupaTable } from 'components/grid'
import { isNumericalColumn } from 'components/grid/utils'
import { ExecuteSqlData, useExecuteSqlPrefetch, useExecuteSqlQuery } from '../sql/execute-sql-query'

type GetTableRowsCountArgs = {
  table?: SupaTable
  filters?: Filter[]
}

export const getTableRowsCountSqlQuery = ({ table, filters = [] }: GetTableRowsCountArgs) => {
  const query = new Query()

  if (!table) {
    return ``
  }

  let queryChains = query.from(table.name, table.schema ?? undefined).count()
  filters
    .filter((x) => x.value && x.value != '')
    .forEach((x) => {
      const value = formatFilterValue(table, x)
      queryChains = queryChains.filter(x.column, x.operator, value)
    })

  const sql = queryChains.toSql()

  return sql
}

export type TableRowsCount = {
  count: number
}

export type TableRowsCountVariables = GetTableRowsCountArgs & {
  projectRef?: string
  connectionString?: string
  queryKey?: QueryKey
}

export type TableRowsCountData = TableRowsCount
export type TableRowsCountError = unknown

export const useTableRowsCountQuery = <TData extends TableRowsCountData = TableRowsCountData>(
  { projectRef, connectionString, queryKey, table, ...args }: TableRowsCountVariables,
  options: UseQueryOptions<ExecuteSqlData, TableRowsCountError, TData> = {}
) =>
  useExecuteSqlQuery(
    {
      projectRef,
      connectionString,
      sql: getTableRowsCountSqlQuery({ table, ...args }),
      queryKey: [
        ...(queryKey ?? []),
        { table: { name: table?.name, schema: table?.schema }, ...args },
      ],
    },
    {
      select(data) {
        return {
          count: data.result[0].count,
        } as TData
      },
      enabled: typeof projectRef !== 'undefined' && typeof table !== 'undefined',
      ...options,
    }
  )

export const useTableRowsCountPrefetch = ({
  projectRef,
  connectionString,
  queryKey,
  table,
  ...args
}: TableRowsCountVariables) => {
  return useExecuteSqlPrefetch({
    projectRef,
    connectionString,
    sql: getTableRowsCountSqlQuery({ table, ...args }),
    queryKey: [
      ...(queryKey ?? []),
      { table: { name: table?.name, schema: table?.schema }, ...args },
    ],
  })
}

/**
 * temporary fix until we implement a better filter UI
 * which validate input value base on the column type
 */
function formatFilterValue(table: SupaTable, filter: Filter) {
  const column = table.columns.find((x) => x.name == filter.column)
  if (column && isNumericalColumn(column.format)) {
    const numberValue = Number(filter.value)
    if (Number.isNaN(numberValue)) return filter.value
    else return Number(filter.value)
  }
  return filter.value
}