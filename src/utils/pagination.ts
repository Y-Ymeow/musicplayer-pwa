import { useEffect, useMemo, useState } from 'preact/hooks';

export function usePagination(total: number, pageSize = 20) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const range = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { start, end };
  }, [page, pageSize]);

  return {
    page,
    totalPages,
    pageSize,
    setPage,
    next: () => setPage((prev) => Math.min(totalPages, prev + 1)),
    prev: () => setPage((prev) => Math.max(1, prev - 1)),
    range,
  };
}
