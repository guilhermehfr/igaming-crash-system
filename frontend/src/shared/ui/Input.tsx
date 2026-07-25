import { tv } from 'tailwind-variants';

const input = tv({
  base: 'block w-full rounded-sm py-4 px-4 text-white placeholder-slate-500 sm:text-sm bg-slate-900/60 border border-slate-700/60 focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none transition-colors duration-200',
});

type InputProps = React.ComponentPropsWithoutRef<'input'>;

export function Input({ className, ...props }: InputProps) {
  return <input className={input({ className })} {...props} />;
}
