'use client';

import { useState } from 'react';
import { StarRating } from '@/components/StarRating/StarRating';
import { ratingsApi } from '@/services/ratingsApi';
import styles from './CourseRatingSection.module.scss';

// Placeholder hasta que se implemente autenticación
const PLACEHOLDER_USER_ID = 1;

interface CourseRatingSectionProps {
  courseId: number;
}

export const CourseRatingSection = ({ courseId }: CourseRatingSectionProps) => {
  const [userRating, setUserRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRate = async (rating: number) => {
    setSubmitting(true);
    setMessage(null);
    try {
      await ratingsApi.createRating(courseId, {
        user_id: PLACEHOLDER_USER_ID,
        rating,
      });
      setUserRating(rating);
      setMessage('¡Gracias por tu calificación!');
    } catch {
      setMessage('Error al enviar la calificación. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.ratingSection}>
      <h3 className={styles.title}>Califica este curso</h3>
      <StarRating
        rating={userRating}
        size="large"
        readonly={submitting}
        onRate={!submitting ? handleRate : undefined}
      />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};
