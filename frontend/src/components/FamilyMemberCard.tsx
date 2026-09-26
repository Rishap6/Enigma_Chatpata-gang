import React from 'react';
import { Link } from 'react-router-dom';
import { FamilyMemberSummary } from '../types';
import { AllergyBadge } from './AllergyBadge';
import { User, ShieldAlert, Utensils, Phone, ChevronRight } from 'lucide-react';

interface FamilyMemberCardProps {
  member: FamilyMemberSummary;
}

export const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({ member }) => {
  return (
    <div className="card-interactive p-5 flex flex-col justify-between h-full group">
      <div>
        {/* Header: Avatar, Name, Relationship */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            {member.avatar ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <span>{member.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
              {member.name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 capitalize">
              {member.relationship && <span>{member.relationship}</span>}
              {member.relationship && member.age !== null && member.age !== undefined && <span>•</span>}
              {member.age !== null && member.age !== undefined && <span>Age {member.age}</span>}
            </div>
          </div>
        </div>

        {/* Quick requirement badges / pills */}
        <div className="space-y-2 mb-4">
          {member.allergies_summary.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 items-center">
              {member.allergies_summary.slice(0, 3).map((a, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-500" />
                  {a}
                </span>
              ))}
              {member.allergies_summary.length > 3 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  +{member.allergies_summary.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">No declared allergies</div>
          )}

          {/* Counts overview */}
          <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
            {member.dietary_rule_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                {member.dietary_rule_count} restriction{member.dietary_rule_count > 1 ? 's' : ''}
              </span>
            )}
            {member.emergency_contact_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                {member.emergency_contact_count} contact{member.emergency_contact_count > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="pt-3 border-t border-slate-100 mt-2">
        <Link
          to={`/family/member/${member.id}`}
          className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl transition-all"
        >
          <span>View Profile</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};
