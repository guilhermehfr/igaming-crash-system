export function gridBackgroundStyle(): React.CSSProperties {
  return {
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px),' +
      'repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 60px)',
  };
}
