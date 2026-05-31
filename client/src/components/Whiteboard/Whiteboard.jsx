import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { fabric } from 'fabric';
import { SocketContext } from '../../context/SocketContext';
import useAuthStore from '../../store/authStore';
import * as whiteboardApi from '../../services/whiteboardApi';
import {
  Pencil,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Type,
  Eraser,
  MousePointer,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Minus
} from 'lucide-react';

const Whiteboard = ({ roomId, isOpen, onClose }) => {
  const { socket } = useContext(SocketContext);
  const { user } = useAuthStore();

  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [activeTool, setActiveTool] = useState('pen');
  const [brushSize, setBrushSize] = useState(2);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('transparent');
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState(new Map());
  const [drawingUsers, setDrawingUsers] = useState(new Set());
  const autoSaveIntervalRef = useRef(null);
  const userColor = useRef('#' + Math.floor(Math.random()*16777215).toString(16));

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth - 100,
      height: window.innerHeight - 100,
      backgroundColor: '#ffffff',
      isDrawingMode: false
    });

    fabricCanvasRef.current = canvas;

    // Load saved state
    loadWhiteboardState();

    // Join whiteboard room
    if (socket) {
      socket.emit('whiteboard:join', {
        roomId,
        userName: user?.name || 'Anonymous',
        userColor: userColor.current
      });
    }

    // Setup event listeners
    setupCanvasEvents(canvas);

    // Auto-save every 30 seconds
    autoSaveIntervalRef.current = setInterval(() => {
      saveWhiteboardState();
    }, 30000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      canvas.dispose();
    };
  }, [isOpen, roomId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Remote drawing
    socket.on('whiteboard:draw', ({ path, userId }) => {
      if (userId !== user?.id) {
        const pathObj = new fabric.Path(path.path, {
          stroke: path.stroke,
          strokeWidth: path.strokeWidth,
          fill: false,
          selectable: false
        });
        canvas.add(pathObj);
        canvas.renderAll();
      }
    });

    // Object added
    socket.on('whiteboard:object-added', ({ object }) => {
      fabric.util.enlivenObjects([object], (objects) => {
        objects.forEach((obj) => {
          canvas.add(obj);
        });
        canvas.renderAll();
      });
    });

    // Object modified
    socket.on('whiteboard:object-modified', ({ object }) => {
      const existingObj = canvas.getObjects().find(o => o.id === object.id);
      if (existingObj) {
        existingObj.set(object);
        canvas.renderAll();
      }
    });

    // Object removed
    socket.on('whiteboard:object-removed', ({ objectId }) => {
      const obj = canvas.getObjects().find(o => o.id === objectId);
      if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
      }
    });

    // Clear whiteboard
    socket.on('whiteboard:clear', () => {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
      setHistory([]);
      setHistoryStep(-1);
    });

    // Remote cursor movement
    socket.on('whiteboard:cursor-move', ({ userId, cursor, userName, userColor }) => {
      setRemoteCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(userId, { cursor, userName, userColor });
        return newCursors;
      });
    });

    // User joined
    socket.on('whiteboard:user-joined', ({ userId, userName, userColor }) => {
      console.log(`${userName} joined whiteboard`);
    });

    // User left
    socket.on('whiteboard:user-left', ({ userId }) => {
      setRemoteCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.delete(userId);
        return newCursors;
      });
    });

    // Drawing status
    socket.on('whiteboard:drawing-status', ({ userId, userName, isDrawing }) => {
      if (isDrawing) {
        setDrawingUsers(prev => new Set(prev).add(userName));
      } else {
        setDrawingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userName);
          return newSet;
        });
      }
    });

    return () => {
      socket.off('whiteboard:draw');
      socket.off('whiteboard:object-added');
      socket.off('whiteboard:object-modified');
      socket.off('whiteboard:object-removed');
      socket.off('whiteboard:clear');
      socket.off('whiteboard:cursor-move');
      socket.off('whiteboard:user-joined');
      socket.off('whiteboard:user-left');
      socket.off('whiteboard:drawing-status');
    };
  }, [socket, user]);

  // Setup canvas events
  const setupCanvasEvents = (canvas) => {
    // Mouse down
    canvas.on('mouse:down', (e) => {
      setIsDrawing(true);
      if (socket) {
        socket.emit('whiteboard:drawing-status', {
          roomId,
          isDrawing: true,
          userId: user?.id
        });
      }

      if (activeTool === 'pen') {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = brushSize;
      } else if (activeTool !== 'select' && activeTool !== 'eraser') {
        const pointer = canvas.getPointer(e.e);
        createShape(pointer);
      }
    });

    // Mouse up
    canvas.on('mouse:up', () => {
      setIsDrawing(false);
      if (socket) {
        socket.emit('whiteboard:drawing-status', {
          roomId,
          isDrawing: false,
          userId: user?.id
        });
      }
      canvas.isDrawingMode = false;
      saveToHistory();
    });

    // Mouse move (cursor tracking)
    canvas.on('mouse:move', (e) => {
      const pointer = canvas.getPointer(e.e);
      if (socket) {
        socket.emit('whiteboard:cursor-move', {
          roomId,
          cursor: { x: pointer.x, y: pointer.y },
          userId: user?.id
        });
      }
    });

    // Path created (freehand drawing)
    canvas.on('path:created', (e) => {
      const path = e.path;
      if (socket) {
        socket.emit('whiteboard:draw', {
          roomId,
          path: {
            path: path.path,
            stroke: path.stroke,
            strokeWidth: path.strokeWidth
          },
          userId: user?.id
        });
      }
    });

    // Object added
    canvas.on('object:added', (e) => {
      if (socket && e.target.id) {
        socket.emit('whiteboard:object-added', {
          roomId,
          object: e.target.toJSON(['id']),
          userId: user?.id
        });
      }
    });

    // Object modified
    canvas.on('object:modified', (e) => {
      if (socket && e.target.id) {
        socket.emit('whiteboard:object-modified', {
          roomId,
          object: e.target.toJSON(['id']),
          userId: user?.id
        });
      }
      saveToHistory();
    });
  };

  // Create shape based on active tool
  const createShape = (pointer) => {
    const canvas = fabricCanvasRef.current;
    let shape;
    const id = Date.now() + Math.random();

    switch (activeTool) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 100,
          height: 60,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: brushSize,
          id
        });
        break;

      case 'circle':
        shape = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 50,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: brushSize,
          id
        });
        break;

      case 'triangle':
        shape = new fabric.Triangle({
          left: pointer.x,
          top: pointer.y,
          width: 100,
          height: 100,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: brushSize,
          id
        });
        break;

      case 'line':
        shape = new fabric.Line([pointer.x, pointer.y, pointer.x + 100, pointer.y], {
          stroke: strokeColor,
          strokeWidth: brushSize,
          id
        });
        break;

      case 'arrow':
        const line = new fabric.Line([pointer.x, pointer.y, pointer.x + 100, pointer.y], {
          stroke: strokeColor,
          strokeWidth: brushSize,
          id
        });
        const triangle = new fabric.Triangle({
          left: pointer.x + 100,
          top: pointer.y,
          width: 15,
          height: 15,
          fill: strokeColor,
          angle: 90,
          originX: 'center',
          originY: 'center'
        });
        shape = new fabric.Group([line, triangle], { id });
        break;

      case 'text':
        shape = new fabric.IText('Text', {
          left: pointer.x,
          top: pointer.y,
          fill: strokeColor,
          fontSize: 20,
          fontFamily: 'Arial',
          id
        });
        break;

      default:
        return;
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  };

  // Save to history
  const saveToHistory = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const json = canvas.toJSON(['id']);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(json);
      // Keep only last 50 steps
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryStep(prev => Math.min(prev + 1, 49));
  };

  // Undo
  const handleUndo = () => {
    if (historyStep > 0) {
      const canvas = fabricCanvasRef.current;
      const prevState = history[historyStep - 1];
      canvas.loadFromJSON(prevState, () => {
        canvas.renderAll();
      });
      setHistoryStep(prev => prev - 1);

      if (socket) {
        socket.emit('whiteboard:undo', { roomId, userId: user?.id });
      }
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const canvas = fabricCanvasRef.current;
      const nextState = history[historyStep + 1];
      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
      });
      setHistoryStep(prev => prev + 1);

      if (socket) {
        socket.emit('whiteboard:redo', { roomId, userId: user?.id });
      }
    }
  };

  // Clear whiteboard
  const handleClear = () => {
    if (!window.confirm('Clear the entire whiteboard? This cannot be undone.')) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    setHistory([]);
    setHistoryStep(-1);

    if (socket) {
      socket.emit('whiteboard:clear', { roomId, userId: user?.id });
    }
  };

  // Download as PNG
  const handleDownloadPNG = () => {
    const canvas = fabricCanvasRef.current;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1
    });

    const link = document.createElement('a');
    link.download = `whiteboard-${roomId}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  // Download as PDF (using jsPDF would be needed)
  const handleDownloadPDF = () => {
    alert('PDF export requires jsPDF library. PNG export is available.');
    handleDownloadPNG();
  };

  // Load whiteboard state
  const loadWhiteboardState = async () => {
    try {
      const response = await whiteboardApi.getWhiteboardState(roomId);
      const canvas = fabricCanvasRef.current;

      if (response.whiteboard && response.whiteboard.canvasData) {
        canvas.loadFromJSON(response.whiteboard.canvasData, () => {
          canvas.renderAll();
        });
      }
    } catch (error) {
      console.error('Error loading whiteboard state:', error);
    }
  };

  // Save whiteboard state
  const saveWhiteboardState = async () => {
    try {
      const canvas = fabricCanvasRef.current;
      const canvasData = canvas.toJSON(['id']);
      const objects = canvas.getObjects();

      if (socket) {
        socket.emit('whiteboard:save', {
          roomId,
          canvasData,
          objects
        });
      }
    } catch (error) {
      console.error('Error saving whiteboard state:', error);
    }
  };

  // Change tool
  const handleToolChange = (tool) => {
    setActiveTool(tool);
    const canvas = fabricCanvasRef.current;

    if (tool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = brushSize;
    } else {
      canvas.isDrawingMode = false;
    }

    if (tool === 'select') {
      canvas.selection = true;
    } else {
      canvas.selection = false;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStep, history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex">
      {/* Toolbar */}
      <div className="w-20 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-2">
        {/* Tool buttons */}
        <ToolButton
          icon={<MousePointer size={20} />}
          active={activeTool === 'select'}
          onClick={() => handleToolChange('select')}
          title="Select"
        />
        <ToolButton
          icon={<Pencil size={20} />}
          active={activeTool === 'pen'}
          onClick={() => handleToolChange('pen')}
          title="Pen"
        />
        <ToolButton
          icon={<Square size={20} />}
          active={activeTool === 'rectangle'}
          onClick={() => handleToolChange('rectangle')}
          title="Rectangle"
        />
        <ToolButton
          icon={<Circle size={20} />}
          active={activeTool === 'circle'}
          onClick={() => handleToolChange('circle')}
          title="Circle"
        />
        <ToolButton
          icon={<Triangle size={20} />}
          active={activeTool === 'triangle'}
          onClick={() => handleToolChange('triangle')}
          title="Triangle"
        />
        <ToolButton
          icon={<Minus size={20} />}
          active={activeTool === 'line'}
          onClick={() => handleToolChange('line')}
          title="Line"
        />
        <ToolButton
          icon={<ArrowRight size={20} />}
          active={activeTool === 'arrow'}
          onClick={() => handleToolChange('arrow')}
          title="Arrow"
        />
        <ToolButton
          icon={<Type size={20} />}
          active={activeTool === 'text'}
          onClick={() => handleToolChange('text')}
          title="Text"
        />
        <ToolButton
          icon={<Eraser size={20} />}
          active={activeTool === 'eraser'}
          onClick={() => handleToolChange('eraser')}
          title="Eraser"
        />

        <div className="border-t border-gray-700 w-full my-2"></div>

        {/* Color picker */}
        <div className="flex flex-col items-center space-y-2">
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
            title="Stroke color"
          />
          <input
            type="color"
            value={fillColor === 'transparent' ? '#ffffff' : fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
            title="Fill color"
          />
        </div>

        {/* Brush size */}
        <div className="flex flex-col items-center space-y-1 px-2">
          <span className="text-white text-xs">{brushSize}px</span>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-12 transform -rotate-90 origin-center"
            title="Brush size"
          />
        </div>

        <div className="border-t border-gray-700 w-full my-2"></div>

        {/* Actions */}
        <ToolButton
          icon={<Undo2 size={20} />}
          onClick={handleUndo}
          disabled={historyStep <= 0}
          title="Undo (Ctrl+Z)"
        />
        <ToolButton
          icon={<Redo2 size={20} />}
          onClick={handleRedo}
          disabled={historyStep >= history.length - 1}
          title="Redo (Ctrl+Y)"
        />
        <ToolButton
          icon={<Trash2 size={20} />}
          onClick={handleClear}
          title="Clear all"
        />
        <ToolButton
          icon={<Download size={20} />}
          onClick={handleDownloadPNG}
          title="Download PNG"
        />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between z-10">
          <div>
            <h2 className="text-white font-semibold">Whiteboard</h2>
            {drawingUsers.size > 0 && (
              <p className="text-sm text-gray-400">
                {Array.from(drawingUsers).join(', ')} {drawingUsers.size === 1 ? 'is' : 'are'} drawing...
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Canvas */}
        <div className="absolute inset-0 pt-14 flex items-center justify-center bg-gray-700">
          <canvas ref={canvasRef} />
        </div>

        {/* Remote cursors */}
        {Array.from(remoteCursors.entries()).map(([userId, data]) => (
          <div
            key={userId}
            className="absolute pointer-events-none z-20"
            style={{
              left: data.cursor.x + 80,
              top: data.cursor.y + 56,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={data.userColor}>
              <path d="M5 3l14 9-5.5 1.5L11 19z" />
            </svg>
            <div
              className="text-xs text-white px-2 py-1 rounded mt-1"
              style={{ backgroundColor: data.userColor }}
            >
              {data.userName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tool button component
const ToolButton = ({ icon, active, onClick, disabled, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-3 rounded-lg transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : disabled
        ? 'text-gray-600 cursor-not-allowed'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {icon}
  </button>
);

export default Whiteboard;
