import React from 'react';
import { GRADES, GRADE_LETTERS, parseClass } from '../utils/school';

interface ClassPickerProps {
  value: string;
  onChange: (cls: string) => void;
  required?: boolean;
}

/**
 * 2-step inline class picker:
 * Step 1: pick grade (X / XI / XII) as segmented buttons
 * Step 2: pick letter (A-J or A-K) as compact buttons
 *
 * Much better UX than a 32-item dropdown that renders upward on mobile.
 */
export const ClassPicker: React.FC<ClassPickerProps> = ({ value, onChange, required }) => {
  const parsed = value ? parseClass(value) : null;
  const selectedGrade = parsed?.grade || '';
  const selectedLetter = parsed?.letter || '';

  const letters = selectedGrade ? GRADE_LETTERS[selectedGrade] : [];

  const selectGrade = (grade: string) => {
    // Reset letter if grade changes
    if (grade !== selectedGrade) {
      onChange('');
    }
    // We set only grade, user must still pick letter
    // Store intermediate: just grade, no letter yet — pass flag via state
  };

  const handleGrade = (grade: string) => {
    if (grade === selectedGrade && selectedLetter) {
      // Clicking same grade while letter selected — keep letter, do nothing
      return;
    }
    // Clear selection if grade changes
    onChange('');
    // Now set grade into a temp state via a trick: store as "X-" prefix
    // Actually we'll track via parent value + local grade state
    _setTempGrade(grade);
  };

  const [tempGrade, _setTempGrade] = React.useState(selectedGrade);

  // Sync tempGrade with parsed grade from value
  React.useEffect(() => {
    if (parsed?.grade) _setTempGrade(parsed.grade);
  }, [parsed?.grade]);

  const activeGrade = parsed?.grade || tempGrade;
  const availableLetters = activeGrade ? GRADE_LETTERS[activeGrade] : [];

  const handleGradeClick = (grade: string) => {
    if (grade !== activeGrade) {
      _setTempGrade(grade);
      onChange(''); // clear letter
    }
  };

  const handleLetterClick = (letter: string) => {
    onChange(`${activeGrade}-${letter}`);
  };

  return (
    <div className="space-y-2">
      {/* Hidden actual input for form validation */}
      <input
        type="text"
        required={required}
        value={value}
        readOnly
        className="sr-only"
        tabIndex={-1}
      />

      {/* Grade selector */}
      <div>
        <p className="text-xs text-slate-500 mb-1.5">Tingkat</p>
        <div className="flex gap-2">
          {GRADES.map(grade => (
            <button
              key={grade}
              type="button"
              onClick={() => handleGradeClick(grade)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                activeGrade === grade
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>

      {/* Letter selector — shown once grade is picked */}
      {activeGrade && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Kelas</p>
          <div className="flex flex-wrap gap-1.5">
            {availableLetters.map(letter => {
              const cls = `${activeGrade}-${letter}`;
              const isSelected = value === cls;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleLetterClick(letter)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold border-2 transition-all ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected display */}
      {value && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Dipilih:</span>
          <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">{value}</span>
        </div>
      )}
    </div>
  );
};
