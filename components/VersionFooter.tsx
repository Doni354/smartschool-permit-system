import React from 'react';
import { Link } from 'react-router-dom';

export const VersionFooter: React.FC<{ schoolName?: string }> = ({ schoolName }) => {
  return (
    <p className="text-center text-xs text-slate-400">
      E-Dispen v2 &copy; 2026{schoolName ? ` — ${schoolName}` : ''}{' · '}
      <Link to="/changelog" className="text-blue-500 hover:text-blue-600 underline underline-offset-2 transition-colors">
        changelog
      </Link>
      {' · '}
      <Link to="/panduan" className="text-blue-500 hover:text-blue-600 underline underline-offset-2 transition-colors">
        panduan
      </Link>
    </p>
  );
};
