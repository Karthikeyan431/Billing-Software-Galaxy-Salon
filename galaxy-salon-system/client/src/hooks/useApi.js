import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useApi(serviceFn, params = null, immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await serviceFn(overrideParams || params);
      setData(res.data);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [serviceFn, params]);

  useEffect(() => {
    if (immediate) execute();
  }, []);

  return { data, loading, error, execute, setData };
}
