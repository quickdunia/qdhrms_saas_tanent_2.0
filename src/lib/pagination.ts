export function getPaginationParams(inputPage?: string, pageSize = 10) {
  const page = Math.max(Number.parseInt(inputPage ?? "1", 10) || 1, 1);
  const take = pageSize;
  const skip = (page - 1) * take;

  return {
    page,
    take,
    skip,
  };
}

export function getTotalPages(total: number, pageSize: number) {
  return Math.max(Math.ceil(total / pageSize), 1);
}
