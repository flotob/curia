'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search,
  ArrowLeft,
  Clock,
  Users,
  GraduationCap
} from 'lucide-react';
import { 
  REQUIREMENT_TYPES, 
  REQUIREMENT_CATEGORIES, 
  DIFFICULTY_LEVELS, 
  searchRequirements, 
  getRequirementsByCategory, 
  sortRequirementsByPopularity,
  RequirementTypeInfo 
} from '@/data/requirementTypes';
import { RequirementType, RequirementCategory } from '@/types/locks';

interface RequirementTypePickerProps {
  onSelectType: (requirementType: RequirementType) => void;
  onBack: () => void;
}

type FilterMode = 'all' | 'category' | 'difficulty';

export const RequirementTypePicker: React.FC<RequirementTypePickerProps> = ({
  onSelectType,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<RequirementCategory | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);

  // Filtered and sorted requirements
  const filteredRequirements = useMemo(() => {
    let requirements = searchRequirements(searchQuery);
    
    // Apply category filter
    if (filterMode === 'category' && selectedCategory) {
      requirements = getRequirementsByCategory(selectedCategory);
      if (searchQuery.trim()) {
        requirements = requirements.filter(req => 
          req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }
    
    // Apply difficulty filter
    if (filterMode === 'difficulty' && selectedDifficulty) {
      requirements = requirements.filter(req => req.difficulty === selectedDifficulty);
    }
    
    return sortRequirementsByPopularity(requirements);
  }, [searchQuery, filterMode, selectedCategory, selectedDifficulty]);

  // Group requirements by category for display
  const groupedRequirements = useMemo(() => {
    const groups: Record<RequirementCategory, RequirementTypeInfo[]> = {
      token: [],
      social: [],
      identity: []
    };
    
    filteredRequirements.forEach(req => {
      groups[req.category].push(req);
    });
    
    return groups;
  }, [filteredRequirements]);

  const handleSelectType = (requirementType: RequirementType) => {
    onSelectType(requirementType);
  };

  const handleKeyPress = (e: React.KeyboardEvent, requirementType: RequirementType) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectType(requirementType);
    }
  };

  const renderRequirementCard = (req: RequirementTypeInfo) => {
    const difficulty = DIFFICULTY_LEVELS[req.difficulty];
    
    return (
      <div
        key={req.type}
        onClick={() => handleSelectType(req.type)}
        onKeyDown={(e) => handleKeyPress(e, req.type)}
        tabIndex={0}
        className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <div className="flex items-start gap-3">
          <div className="text-2xl">{req.icon}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {req.name}
              </h3>
              <div className="flex items-center gap-2">
                {/* Popularity indicator */}
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{req.popularity}%</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {req.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Difficulty badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${difficulty.bgColor} ${difficulty.textColor}`}>
                  <GraduationCap className="h-3 w-3" />
                  {difficulty.name}
                </span>
              </div>
              
              {/* Estimated config time */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {req.estimatedConfigTime}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCategorySection = (category: RequirementCategory) => {
    const categoryInfo = REQUIREMENT_CATEGORIES[category];
    const requirements = groupedRequirements[category];
    
    if (requirements.length === 0) return null;
    
    return (
      <div key={category} className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{categoryInfo.icon}</span>
          <h2 className="text-lg font-semibold text-gray-900">
            {categoryInfo.name}
          </h2>
          <span className="text-sm text-gray-500">
            ({requirements.length})
          </span>
        </div>
        
        <div className="grid gap-3 md:grid-cols-2">
          {requirements.map(renderRequirementCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Requirements
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          Choose a requirement type to add
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search requirement types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Filter by:</span>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterMode === 'all' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({REQUIREMENT_TYPES.length})
          </button>
          
          <select
            value={selectedCategory || ''}
            onChange={(e) => {
              const cat = e.target.value as RequirementCategory;
              setSelectedCategory(cat || null);
              setFilterMode(cat ? 'category' : 'all');
            }}
            className="px-3 py-1 text-sm border border-gray-300 rounded-full focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {Object.entries(REQUIREMENT_CATEGORIES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.icon} {info.name}
              </option>
            ))}
          </select>
          
          <select
            value={selectedDifficulty || ''}
            onChange={(e) => {
              const diff = e.target.value as 'beginner' | 'intermediate' | 'advanced';
              setSelectedDifficulty(diff || null);
              setFilterMode(diff ? 'difficulty' : 'all');
            }}
            className="px-3 py-1 text-sm border border-gray-300 rounded-full focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Difficulties</option>
            {Object.entries(DIFFICULTY_LEVELS).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div>
        {filteredRequirements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No requirements found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filterMode === 'all' || filterMode === 'category' ? (
              // Group by category
              <>
                {renderCategorySection('token')}
                {renderCategorySection('social')}
                {renderCategorySection('identity')}
              </>
            ) : (
              // Flat list for difficulty filter
              <div className="grid gap-3 md:grid-cols-2">
                {filteredRequirements.map(renderRequirementCard)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 