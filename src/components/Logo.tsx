import React from 'react';
import { BRAND_NAME } from '../brand';

/** The product name as plain text. Swap in artwork here when there is some. */
export const Logo: React.FC<{ className?: string }> = ({ className }) => <span className={className}>{BRAND_NAME}</span>;
