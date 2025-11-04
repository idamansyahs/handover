import React from 'react';

// Konteks ini akan menyimpan 'ref' ke elemen yang bisa di-scroll.
// Default-nya null, yang berarti 'window'.
export const ScrollContext = React.createContext(null);