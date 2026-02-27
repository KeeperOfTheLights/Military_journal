'use client';

import Link from 'next/link';
import './Footer.css';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-left">
                    <p>© {currentYear} Военная Кафедра КазУТБ. Все права защищены.</p>
                </div>
                <div className="footer-right">
                    <Link href="/privacy" className="footer-link">Конфиденциальность</Link>
                    <Link href="/terms" className="footer-link">Условия использования</Link>
                    <Link href="/support" className="footer-link">Поддержка</Link>
                </div>
            </div>
        </footer>
    );
}
