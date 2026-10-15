/** A slow connection must not leave a staff control locked indefinitely.
 * Timeout is ambiguous: the original Firebase write may still finish later. */
export async function confirmWrite<T>(operation: Promise<T>, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('This save could not be confirmed yet. It may still finish. Check the latest data before retrying.')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
