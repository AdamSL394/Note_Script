
export const normalizeUserId = (rawId: string): string =>
    rawId.length !== 24 ? rawId + '000' : rawId;
  