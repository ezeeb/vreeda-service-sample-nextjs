import { DeviceRequestModel } from "@/types/vreedaApi";
import { Box, Button, Card, CardContent, Link, TextField, Typography } from "@mui/material";
import { useState } from "react";

export default function CustomPatternControl({selectedDevices}: {selectedDevices: string[]}) {
    const [pattern, setPattern] = useState("type:football|f:3|x:9.3|r:0.1,0,1.0;0.1,1.0,0;0.1,0,1.0;0.7,1.0,0;0.2,0,0;0.1,0,1.0;0.1,1.0,0;0.1,0,1.0;0.2,1.0,0;0.3,0,0.0;0.1,0.0,0;0.2,0,0.0;0.4,0.0,0;0.1,0,1.0;0.1,1.0,0;0.1,0,1.0;0.2,1.0,0;0.3,0,1.0;0.1,1.0,0;0.2,0,1.0;0.4,1.0,0;0.1,0,1.0;0.1,1.0,0;0.1,0,1.0;0.7,1.0,0;0.3,0,1.0;0.1,1.0,0;0.2,0,1.0;0.4,1.0,0;0.2,0,1.0;0.9,1.0,0;2,0,0|g:0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.7,0.0,0;0.2,0,0;0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.2,0.0,0;0.3,0,1.0;0.1,1.0,0;0.2,0,1.0;0.4,1.0,0;0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.2,0.0,0;0.3,0,0.0;0.1,0.0,0;0.2,0,0.0;0.4,0.0,0;0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.7,0.0,0;0.3,0,0.0;0.1,0.0,0;0.2,0,0.0;0.4,0.0,0;0.2,0,0.0;0.9,0.0,0;2,0,0|b:0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.7,0.0,0;0.2,0,0;0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.2,0.0,0;0.3,0,0.0235;0.1,0.0235,0;0.2,0,0.0235;0.4,0.0235,0;0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.2,0.0,0;0.3,0,0.0;0.1,0.0,0;0.2,0,0.0;0.4,0.0,0;0.1,0,0.0;0.1,0.0,0;0.1,0,0.0;0.7,0.0,0;0.3,0,0.0;0.1,0.0,0;0.2,0,0.0;0.4,0.0,0;0.2,0,0.0;0.9,0.0,0;2,0,0|c:0.1,0,0;0.1,0,0.15;0.3,0.15,0;0.5,0,0;0.2,0,0;0.2,0,0;0.1,0,0.15;0.2,0.15,0;0.4,0,0;0.1,0,0.15;0.2,0.15,0;0.3,0,0;0.2,0,0;0.1,0,0.15;0.2,0.15,0;0.4,0,0;0.1,0,0.15;0.2,0.15,0;0.3,0,0;0.1,0,0;0.1,0,0.15;0.3,0.15,0;0.5,0,0;0.4,0,0;0.1,0,0.15;0.2,0.15,0;0.3,0,0;1.1,0,0;2,0,0");

    const handleRunClicked = async () => {
        console.log("patching devices: ", selectedDevices);
        const request: DeviceRequestModel = {
            states: {
                pattern: pattern,
                program: 'custom',
            }
        };
        selectedDevices.forEach(async (deviceId) => {
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
        });
    };

    return (
        <Card variant="outlined" sx={{ mb: 2, p: 2, backgroundColor: '#2A1D24' }}>
          <CardContent>
            <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                    label="Custom Pattern"
                    variant="outlined"
                    multiline
                    rows={10}
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    fullWidth
                    InputLabelProps={{
                    sx: { color: "white" }, // Optional: style the label
                    }}
                    sx={{
                    input: { color: "white" }, // Optional: style the text
                    }}
                />
                <Typography variant="body2" color="text.secondary">
                    More information on custom patterns on{" "}
                    <Link href="https://api.vreeda.com/" target="_blank" rel="noopener noreferrer">
                        https://api.vreeda.com/
                    </Link>
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleRunClicked}
                >
                    Run
                </Button>
            </Box>
          </CardContent>
        </Card>
    );
}