import styles from './Footer.module.css';

function Footer() {

    return (
        <footer className={styles.footerBackground}>
            <div className={styles.footerContent}>
                <h1>Expenses <i>Control</i></h1>
                <p>Uma aplicação criada por Gabriel Müehlbauer</p>
            </div>
        </footer>
    )
}

export default Footer;