import { useEffect, useRef } from 'react';
import { MdClose } from 'react-icons/md';
import styles from './Modal.module.css';
function Modal({ isOpen, onClose, children }) {
  const contentRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const content = contentRef.current;
    const selector = 'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]';
    (content.querySelector(selector) || content).focus();
    function keydown(event) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const focusable = [...content.querySelectorAll(selector)];
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  return <div className={styles.overlay} onClick={onClose}><div ref={contentRef} className={styles.content} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Detalhes ou formulário" tabIndex={-1}>
    <button type="button" onClick={onClose} aria-label="Fechar janela" title="Fechar" className={styles.closeButton}><MdClose aria-hidden="true" /></button>{children}
  </div></div>;
}
export default Modal;
