import { DeviceRequestModel, DeviceResponseModel } from '@/types/vreedaApi';
import { Box, Card, CardContent, Checkbox, FormControlLabel, Slider, Switch, Typography } from '@mui/material';
import { useState } from 'react';

export default function DeviceControl({ id, model, selected, onSelectionChange}: { id: string, model: DeviceResponseModel, selected: boolean, onSelectionChange: (id: string, selected: boolean) => void }) {
  const [isOn, setIsOn] = useState(model.states?.on?.value);
  const [sliderValue, setSliderValue] = useState(model.states?.v?.value || 0);

  async function updateDevice(deviceId: string, request: DeviceRequestModel) {
    try {
      const response = await fetch('/api/vreeda/patch-device', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, request }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update device');
      }
  
      const data = await response.json();
      console.log('Device updated successfully:', data);
      return data;
    } catch (error) {
      console.log('Error updating device:', error);
      throw error;
    }
  }

  const toggleDevice = async () => {
    try {
      await updateDevice(id, {
        states: { on: !isOn },
      });
      setIsOn(!isOn);
    } catch (error) {
      console.log('Failed to update device state:', error);
    }
  };

  const handleSliderChange = async (event: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setSliderValue(newValue);

    try {
      await updateDevice(id, { states: { v: newValue } });
    } catch (error) {
      console.log('Failed to update slider value:', error);
    }
  };

  const handleSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    onSelectionChange(id, isChecked);
  };

  return (
    <Box sx={{ pb: 4 }}>
      <Card variant="outlined" sx={{ p: 2, backgroundColor: '#2A1D24' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {/* Selection Checkbox */}
            <FormControlLabel
                control={
                  <Checkbox
                    checked={selected}
                    onChange={handleSelectionChange}
                    color="primary"
                  />
                }
                label=""
                sx={{ mr: 1 }}
              />
            <Typography variant="h6">
              {model.tags?.customDeviceName || 'Unnamed Device'}
            </Typography>
            {/* Switch positioned at top-right corner */}
            <FormControlLabel
              control={
                <Switch
                  checked={isOn || false}
                  onChange={toggleDevice}
                  color="primary"
                  disabled={!model.connected?.value}
                />
              }
              label=""
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Device ID: {id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {model.connected?.value ? 'Online' : 'Offline'}
          </Typography>

          {/* Slider for 'v' state, with conditional rendering */}
          {typeof sliderValue === 'number' && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Brightness
              </Typography>
              <Slider
                value={sliderValue}
                onChange={handleSliderChange}
                min={0}
                max={1} // Adjust max value based on expected range for 'v'
                step={0.1}
                color="primary"
                aria-labelledby="intensity-slider"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}