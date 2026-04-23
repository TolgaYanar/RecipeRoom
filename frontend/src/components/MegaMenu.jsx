import { Link } from 'react-router-dom';
import { RECIPE_DROPDOWN } from '../constants/tags';

const columnsWithViewAll = ['Ingredient', 'Dish Type', 'Cuisine'];

export default function MegaMenu({ isOpen, onClose, onMouseEnter, onMouseLeave }) {
  return (
    <div
      className={`
        fixed top-[72px] left-0 w-full
        bg-[#FEFEFE]
        border-t-[3px] border-t-[#1B3A2D] border-b border-[#EBEBEB]
        z-[998]
        transition-all duration-[180ms] ease-out
        ${isOpen
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none'
        }
      `}
      style={{
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.11), 0 4px 16px rgba(0, 0, 0, 0.06)',
        padding: '44px 80px 40px 80px'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="grid grid-cols-6">
        {RECIPE_DROPDOWN.map(({ title, param, options }, idx) => (
          <div
            key={title}
            className={`
              ${idx === 0 ? 'pl-0' : 'pl-9'}
              ${idx === 5 ? 'pr-0 border-r-0' : 'pr-9 border-r border-[#F0F0F0]'}
            `}
          >
            <div
              className="text-[15px] font-bold text-[#1A1A1A] pb-4 mb-2 border-b-[1.5px] border-[#E0E0E0]"
              style={{ letterSpacing: '-0.01em' }}
            >
              {title}
            </div>

            <div>
              {options.map(({ label, value }) => (
                <Link
                  key={value}
                  to={`/recipes?${param}=${encodeURIComponent(value)}`}
                  onClick={onClose}
                  className="block text-[14px] font-normal text-[#555555] py-2.5 leading-none transition-all duration-[140ms] hover:text-[#1B3A2D] hover:font-medium hover:pl-[6px] whitespace-nowrap"
                  style={{ letterSpacing: '0.005em' }}
                >
                  {label}
                </Link>
              ))}

              {columnsWithViewAll.includes(title) && (
                <Link
                  to={`/recipes?${param}=all`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 mt-3.5 pt-3 border-t border-[#F0F0F0] text-[13px] font-semibold text-[#1B3A2D] hover:text-[#F5C518] transition-colors duration-150"
                  style={{ letterSpacing: '0.01em' }}
                >
                  VIEW ALL
                  <span className="text-[14px]">›</span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#EBEBEB] mt-8 pt-5 text-center">
        <Link
          to="/recipes"
          onClick={onClose}
          className="text-[13px] font-bold text-[#1B3A2D] uppercase underline hover:text-[#F5C518] transition-colors duration-150"
          style={{
            letterSpacing: '0.10em',
            textUnderlineOffset: '3px'
          }}
        >
          View All Recipes
        </Link>
      </div>
    </div>
  );
}
