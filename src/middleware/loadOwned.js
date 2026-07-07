import { AppError } from '../utils/AppError.js';

// Object-level ownership guard (anti-IDOR): loads :id, asserts it belongs to the
// authenticated farmer, else 404 (never reveals another farmer's id exists).
export const loadOwned = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findById(req.params.id);
    if (!doc || String(doc.farmerId) !== String(req.user.id)) {
      throw new AppError(404, 'NOT_FOUND', 'Not found');
    }
    req.owned = doc;
    next();
  } catch (e) {
    next(e);
  }
};
