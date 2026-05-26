import { useEffect, useState } from 'react';

export function useRetainedQueryValue<T>(value: T | null | undefined) {
  const [retainedValue, setRetainedValue] = useState<T | null>(null);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setRetainedValue(value);
    }
  }, [value]);

  return value ?? retainedValue;
}
