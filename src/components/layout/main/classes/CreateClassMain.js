'use client';

import { useSearchParams } from 'next/navigation';
import CreateClassWizard from '@/components/layout/main/classes/CreateClassWizard';

const CreateClassMain = () => {
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit') || null;
  const isEditMode = Boolean(editId);

  return (
    <div className="w-full">
      <div className="mb-30px">
        <h1 className="text-size-30 text-blackColor dark:text-blackColor-dark font-bold mb-10px">
          {isEditMode ? 'Edit Class' : 'Create New Class'}
        </h1>
        <p className="text-contentColor dark:text-contentColor-dark text-sm">
          {isEditMode 
            ? 'Update class (cohort) information using the step-by-step wizard'
            : 'Create a new class (cohort) for an organization using the step-by-step wizard'
          }
        </p>
      </div>
      <CreateClassWizard editId={editId} isEditMode={isEditMode} />
    </div>
  );
};

export default CreateClassMain;

