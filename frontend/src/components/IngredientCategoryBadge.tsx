import React from 'react';
import { Tag } from 'lucide-react';

interface IngredientCategoryBadgeProps {
  category: string;
}

export const IngredientCategoryBadge: React.FC<IngredientCategoryBadgeProps> = ({ category }) => {
  const getCategoryColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('dairy') || c.includes('milk')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (c.includes('wheat') || c.includes('gluten')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (c.includes('nut') || c.includes('peanut')) {
      return 'bg-orange-50 text-orange-800 border-orange-200';
    }
    if (c.includes('soy')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (c.includes('egg')) {
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    }
    if (c.includes('animal')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (c.includes('plant')) {
      return 'bg-green-50 text-green-800 border-green-200';
    }
    if (c.includes('emulsifier') || c.includes('additive')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
        category
      )}`}
      data-testid="ingredient-category-badge"
    >
      <Tag className="w-3 h-3 opacity-60" />
      <span>{category}</span>
    </span>
  );
};
