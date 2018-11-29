function List<M>(props) {
  const [models, setModels] = useState(() => toArray(props.manager.running()));

  function handleRunningChanged(_, models) {
    setModels(models.filter(props.filterRunning));
  }

  useEffect(() => {
    props.manager.runningChanged.connect(handleRunningChanged);
    return function cleanup() {
      props.manager.runningChanged.disconnect(handleRunningChanged);
    };
  });

  return (
    <ul>
      {models.map((m, i) => (
        <Item key={i} model={m} {...this.props} />
      ))}
    </ul>
  );
}

function List<M>(props) {
  const [models, setModels] = useSignal(
    () => toArray(props.manager.running()),
    props.manager.runningChanged,
    (sender, args) => args.filter(props.filterRunning)
  );

  return (
    <ul>
      {models.map((m, i) => (
        <Item key={i} model={m} {...this.props} />
      ))}
    </ul>
  );
}
