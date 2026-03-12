import React from 'react';
import { cn } from '@/lib/utils';
import './retro-tv-error.css';

interface RetroTvErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  errorCode?: string;
  errorMessage?: string;
}

const RetroTvError = React.forwardRef<HTMLDivElement, RetroTvErrorProps>(
  (
    {
      className,
      errorCode = '404',
      errorMessage = 'NOT FOUND',
      ...props
    },
    ref
  ) => {
    const errorCodeDigits = errorCode.split('');

    return (
      <div
        ref={ref}
        className={cn(
          'retro-tv-wrapper flex items-center justify-center',
          className
        )}
        {...props}
      >
        <div className="retro-main">
          <div className="retro-antenna">
            <div className="retro-antenna_shadow"></div>
            <div className="retro-a1"></div>
            <div className="retro-a1d"></div>
            <div className="retro-a2"></div>
            <div className="retro-a2d"></div>
            <div className="retro-a_base"></div>
          </div>
          <div className="retro-tv">
            <div className="retro-cruve">
              <svg
                viewBox="0 0 189.929 189.929"
                xmlns="http://www.w3.org/2000/svg"
                className="retro-curve_svg"
              >
                <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
              </svg>
            </div>
            <div className="retro-display_div">
              <div className="retro-screen_out">
                <div className="retro-screen_out1">
                  <div className="retro-screen">
                    <span className="retro-notfound_text">{errorMessage}</span>
                  </div>
                  <div className="retro-screenM">
                    <span className="retro-notfound_text">{errorMessage}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="retro-lines">
              <div className="retro-line1"></div>
              <div className="retro-line2"></div>
              <div className="retro-line3"></div>
            </div>
            <div className="retro-buttons_div">
              <div className="retro-b1">
                <div></div>
              </div>
              <div className="retro-b2"></div>
              <div className="retro-speakers">
                <div className="retro-g1">
                  <div className="retro-g11"></div>
                  <div className="retro-g12"></div>
                  <div className="retro-g13"></div>
                </div>
                <div className="retro-g"></div>
                <div className="retro-g"></div>
              </div>
            </div>
          </div>
          <div className="retro-bottom">
            <div className="retro-base1"></div>
            <div className="retro-base2"></div>
            <div className="retro-base3"></div>
          </div>
        </div>
        <div className="retro-text_404">
          {errorCodeDigits.map((digit, index) => (
            <div key={index} className={`retro-text_404_digit retro-text_404${index + 1}`}>
              {digit}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

RetroTvError.displayName = 'RetroTvError';

export { RetroTvError };
