// Shared Mongoose schema options: timestamps + JSON that exposes a string `id`
// (contract uses `id`) and drops `__v`. `_id` remains available too.
export const baseOptions = {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
};
