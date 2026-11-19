import styles from './Footer.module.css';

function Footer() {

    return (
        <footer className={styles.footerBackground}>
            <div className={styles.footerContent}>
                <h1>Expenses <i>Control</i></h1>
                <p>Gerencie suas finanças de forma simples e elegante</p>
            </div>
        </footer>
    )
}

export default Footer;
