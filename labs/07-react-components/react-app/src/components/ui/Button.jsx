import styles from './Button.module.css';

// Universal button: the look comes from `variant`, everything else is passed to the native element.
function Button({ children, onClick, variant = 'primary', type = 'button', ...props }) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

export default Button;
