import { useId } from 'react';
import styles from './Input.module.css';
function Input({ label, id, ...props }) {
  const generated = useId();
  const inputId = id || generated;
  return <div className={styles.container}>{label && <label htmlFor={inputId} className={styles.label}>{label}</label>}<input id={inputId} className={styles.input} {...props} /></div>;
}
export default Input;
