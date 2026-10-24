const MAX_LIMIT = 60;

/**
 * Reads ?page / ?limit from a request.
 *
 * Pagination is opt-in: when a caller sends neither parameter the endpoint
 * keeps its original "return everything" behaviour, so existing clients and
 * the e2e suite are unaffected. The moment a caller sends ?page or ?limit the
 * response is windowed and the totals are published as headers.
 */
const readPaging = (req, defaultLimit = 12) => {
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);

  const wantsPaging =
    req.query.page !== undefined || req.query.limit !== undefined;

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = Number.isNaN(rawLimit)
    ? defaultLimit
    : Math.min(MAX_LIMIT, Math.max(1, rawLimit));

  return {
    wantsPaging,
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * Publishes the totals a "Load more" control needs. The body stays a plain
 * array so callers that only want the records do not have to change shape.
 */
const setPagingHeaders = (res, { total, page, limit }) => {
  res.set('X-Total-Count', String(total));
  res.set('X-Page', String(page));
  res.set('X-Limit', String(limit));
  res.set('X-Total-Pages', String(Math.max(1, Math.ceil(total / limit))));
};

module.exports = { readPaging, setPagingHeaders, MAX_LIMIT };
