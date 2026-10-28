import React from 'react';
import { Wordmark } from './Wordmark';

/** The product name as artwork. Pass a height class such as "h-8"; it follows the surrounding text color. */
export const Logo: React.FC<{ className?: string }> = ({ className }) => <Wordmark className={className} />;
