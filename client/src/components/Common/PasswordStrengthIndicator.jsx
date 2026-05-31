import React, { useState, useEffect } from 'react';

const PasswordStrengthIndicator = ({ password }) => {
  const [strength, setStrength] = useState({
    score: 0,
    label: '',
    color: '',
    requirements: []
  });

  useEffect(() => {
    if (!password) {
      setStrength({ score: 0, label: '', color: '', requirements: [] });
      return;
    }

    const requirements = [
      {
        label: 'At least 8 characters',
        met: password.length >= 8
      },
      {
        label: 'One uppercase letter',
        met: /[A-Z]/.test(password)
      },
      {
        label: 'One lowercase letter',
        met: /[a-z]/.test(password)
      },
      {
        label: 'One number',
        met: /[0-9]/.test(password)
      },
      {
        label: 'One special character',
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      }
    ];

    const metCount = requirements.filter(r => r.met).length;
    let score = 0;
    let label = '';
    let color = '';

    if (metCount <= 2) {
      score = 25;
      label = 'Weak';
      color = 'bg-red-500';
    } else if (metCount === 3) {
      score = 50;
      label = 'Fair';
      color = 'bg-orange-500';
    } else if (metCount === 4) {
      score = 75;
      label = 'Good';
      color = 'bg-yellow-500';
    } else {
      score = 100;
      label = 'Strong';
      color = 'bg-green-500';
    }

    setStrength({ score, label, color, requirements });
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      {/* Strength bar */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${strength.color} transition-all duration-300`}
            style={{ width: `${strength.score}%` }}
          ></div>
        </div>
        <span className={`text-sm font-medium ${
          strength.score <= 25 ? 'text-red-600' :
          strength.score <= 50 ? 'text-orange-600' :
          strength.score <= 75 ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {strength.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        {strength.requirements.map((req, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            {req.met ? (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
