import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from './Card.module.css';

type CardProps = {
  title: string;
  text?: string;
  price?: string;
  image?: string;
  alt?: string;
  featured?: boolean;
  children?: ReactNode;
};

// El archivo es el bloque: styles.card es la raíz y el modificador se aplica con clsx.
export function Card({ title, text, price, image, alt = '', featured = false, children }: CardProps) {
  return (
    <article className={clsx(styles.card, featured && styles.featured)}>
      {image && <img className={styles.media} src={image} alt={alt} loading="lazy" />}
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        {text && <p className={styles.text}>{text}</p>}
        {price && <p className={styles.price}>{price}</p>}
        {children}
      </div>
    </article>
  );
}
