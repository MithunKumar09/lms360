'use client';

import React from 'react';

const TranscriptSection = ({ transcript }) => {
  if (!transcript || transcript.trim() === '') {
    return (
      <div className="mt-30px p-5 bg-lightGrey12 dark:bg-transparent dark:shadow-brand-dark rounded">
        <h4 className="text-lg font-bold text-blackColor dark:text-blackColor-dark mb-15px">
          Transcript
        </h4>
        <p className="text-contentColor dark:text-contentColor-dark">
          No transcript available for this lesson.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-30px p-5 md:p-30px bg-lightGrey12 dark:bg-transparent dark:shadow-brand-dark rounded">
      <h4 className="text-lg font-bold text-blackColor dark:text-blackColor-dark mb-15px">
        Transcript
      </h4>
      <div className="text-contentColor dark:text-contentColor-dark leading-26px whitespace-pre-wrap">
        {transcript}
      </div>
    </div>
  );
};

export default TranscriptSection;

