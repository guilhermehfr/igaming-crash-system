import { tv, type VariantProps } from 'tailwind-variants';

const button = tv({
  base: 'flex items-center justify-center font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer',
  variants: {
    variant: {
      primary: 'bg-cyber-green text-black hover:brightness-110 active:brightness-95',
      ghost: 'bg-transparent text-slate-400 hover:text-white',
    },
    size: {
      md: 'py-4 px-4 text-sm',
      sm: 'py-2 px-3 text-xs',
    },
    rounded: {
      true: 'rounded-sm',
      false: 'rounded-none',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    rounded: true,
  },
});

type ButtonVariants = VariantProps<typeof button>;

type ButtonProps = React.ComponentPropsWithoutRef<'button'> & ButtonVariants;

export function Button({ variant, size, rounded, className, ...props }: ButtonProps) {
  return <button className={button({ variant, size, rounded, className })} {...props} />;
}
