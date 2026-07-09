'use client';
import { useState } from 'react';
export function SeasonPicker(){const [season,setSeason]=useState('2026');return <label><small>SEASON</small><select aria-label="Season" value={season} onChange={e=>setSeason(e.target.value)}><option>2026</option><option>2025</option><option>2024</option></select></label>}
