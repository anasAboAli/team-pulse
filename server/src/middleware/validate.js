/**
 * يتحقق من body/query/params عبر مخططات Zod ويضع النتيجة في req.valid
 * (في Express 5 لا يمكن إعادة تعيين req.query).
 */
export const validate =
  ({ body, query, params } = {}) =>
  (req, _res, next) => {
    req.valid = {
      body: body ? body.parse(req.body ?? {}) : req.body,
      query: query ? query.parse(req.query ?? {}) : req.query,
      params: params ? params.parse(req.params ?? {}) : req.params,
    };
    next();
  };
