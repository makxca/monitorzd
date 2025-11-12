export function isValidPrice(input: string): boolean {
  const price = Number(input.trim());
  return !isNaN(price) && price > 0 && Math.trunc(price) === price;
}

export function isValidDate(input: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(input)) return false;

  const [year, month, day] = input.split('-').map(Number);
  const date = new Date(input);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  return true;
}