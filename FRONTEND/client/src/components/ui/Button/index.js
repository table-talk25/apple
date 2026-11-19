import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Button.module.css';

const VARIANT_CLASSES = {
  primary: styles.primary,
  ghost: styles.ghost,
  green: styles.green,
  danger: styles.danger,
  white: styles.white,
};

const Button = React.forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      fullWidth = false,
      to = null,
      href = null,
      type = 'button',
      className = '',
      children,
      onClick,
      ...rest
    },
    ref
  ) => {
    const classes = [
      styles.btn,
      VARIANT_CLASSES[variant] || styles.primary,
      size === 'sm' ? styles.sm : '',
      fullWidth ? styles.fullWidth : '',
      disabled ? styles.disabled : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (to && !disabled) {
      return (
        <Link ref={ref} to={to} className={classes} onClick={onClick} {...rest}>
          {children}
        </Link>
      );
    }

    if (href && !disabled) {
      return (
        <a ref={ref} href={href} className={classes} onClick={onClick} {...rest}>
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={classes}
        onClick={onClick}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
