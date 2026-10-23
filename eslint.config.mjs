import coreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...coreWebVitals,
  { rules: { 'react-hooks/set-state-in-effect': 'off' } },
];
