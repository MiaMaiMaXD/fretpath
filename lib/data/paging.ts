type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Reads every row of a query past the API max_rows cap by looping .range() until a short page. */
export async function fetchAll<T>(
  build: (from: number, to: number) => Page<T>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
