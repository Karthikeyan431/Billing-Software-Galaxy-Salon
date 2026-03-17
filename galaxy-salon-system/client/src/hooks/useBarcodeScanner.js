import { useState, useEffect, useCallback, useRef } from 'react';
import { productService } from '../services/dataService';
import toast from 'react-hot-toast';

export function useBarcodeScanner(onProductScanned) {
  const [buffer, setBuffer] = useState('');
  const timeoutRef = useRef(null);

  const handleKeyPress = useCallback((e) => {
    // Barcode scanners send characters quickly and end with Enter
    if (e.key === 'Enter' && buffer.length > 3) {
      // Attempt barcode lookup
      const barcode = buffer.trim();
      productService.getByBarcode(barcode)
        .then(({ data }) => {
          if (data.product) {
            onProductScanned(data.product);
            toast.success(`Scanned: ${data.product.productName}`);
          }
        })
        .catch(() => {
          toast.error(`Product not found for barcode: ${barcode}`);
        });
      setBuffer('');
      return;
    }

    // Only accept printable characters
    if (e.key.length === 1) {
      setBuffer(prev => prev + e.key);
      // Reset buffer if no input for 100ms (distinguish from keyboard typing)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setBuffer(''), 100);
    }
  }, [buffer, onProductScanned]);

  useEffect(() => {
    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleKeyPress]);

  return { buffer };
}
