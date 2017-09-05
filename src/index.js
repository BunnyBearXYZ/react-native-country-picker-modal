/**
 * react-native-country-picker
 * @author xcarpentier<contact@xaviercarpentier.com>
 * @flow
 */

// eslint-disable-next-line
import React, { Component } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Modal,
  Text,
  TextInput,
  ListView,
  ScrollView,
  Platform,
} from 'react-native';
import Fuse from 'fuse.js';

import { getHeightPercent } from './ratio';
import CloseButton from './CloseButton';
import countryPickerStyles from './CountryPicker.style';
import KeyboardAvoidingView from './KeyboardAvoidingView';

let countries = [];
let styles = {};

const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

export default class ModalPicker extends Component {
  static propTypes = {
    // cca2: PropTypes.string.isRequired,
    translation: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onClose: PropTypes.func,
    closeable: PropTypes.bool,
    filterable: PropTypes.bool,
    children: PropTypes.node,
    optionsList: PropTypes.array,
    excludeCountries: PropTypes.array,
    styles: PropTypes.object,
    filterPlaceholder: PropTypes.string,
    autoFocusFilter: PropTypes.bool,
  }

  static defaultProps = {
    translation: 'eng',
    optionsList: [],
    excludeCountries: [],
    filterPlaceholder: 'Filter',
    autoFocusFilter: true,
  }

  constructor(props) {
    super(props);

    let optionsList = [...props.optionsList],
      excludeCountries = [...props.excludeCountries];

    excludeCountries.map((excludeCountry)=>{
      let index = optionsList.indexOf(excludeCountry);

      if(index !== -1){
        optionsList.splice(index, 1);
      }
    });

    this.state = {
      modalVisible: false,
      cca2List: optionsList,
      dataSource: ds.cloneWithRows(optionsList),
      filter: '',
      letters: this.getLetters(optionsList),
    };

    if (this.props.styles) {
      Object.keys(countryPickerStyles).forEach(key => {
        styles[key] = StyleSheet.flatten([
          countryPickerStyles[key],
          this.props.styles[key],
        ]);
      });
      styles = StyleSheet.create(styles);
    } else {
      styles = countryPickerStyles;
    }

    this.fuse = new Fuse(
      optionsList.reduce(
        (acc, item) => [...acc, { id: item, name: item }],
        [],
      ), {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name'],
        id: 'id',
      }
    );
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.optionsList !== this.props.optionsList) {
      this.setState({
        cca2List: nextProps.optionsList,
        dataSource: ds.cloneWithRows(nextProps.optionsList),
        letters: this.getLetters(this.props.optionsList),
      });
    }
  }

  onSelectCountry(value) {
    this.setState({
      modalVisible: false,
      filter: '',
      dataSource: ds.cloneWithRows(this.props.optionsList),
    });

    this.props.onChange(value);
  }

  onClose() {
    this.setState({
      modalVisible: false,
      filter: '',
      dataSource: ds.cloneWithRows(this.state.cca2List),
    });
    if (this.props.onClose) {
      this.props.onClose();
    }
  }

  getLetters(list) {
    return Object.keys(list.reduce((acc, val) => ({
      ...acc,
      [val.slice(0, 1).toUpperCase()]: '',
    }), {})).sort();
  }

  getCountryName(country, optionalTranslation) {
    const translation = optionalTranslation || this.props.translation || 'eng';
    return country.name[translation] || country.name.common;
  }

  setVisibleListHeight(offset) {
    this.visibleListHeight = getHeightPercent(100) - offset;
  }

  openModal = this.openModal.bind(this);

  // dimensions of country list and window
  itemHeight = getHeightPercent(7);
  listHeight = countries.length * this.itemHeight;

  openModal() {
    this.setState({ modalVisible: true });
  }

  scrollTo(letter) {
    // find position of first country that starts with letter
    const index = this.state.cca2List.map((country) => this.getCountryName(countries[country])[0])
      .indexOf(letter);
    if (index === -1) {
      return;
    }
    let position = index * this.itemHeight;

    // do not scroll past the end of the list
    if (position + this.visibleListHeight > this.listHeight) {
      position = this.listHeight - this.visibleListHeight;
    }

    // scroll
    this._listView.scrollTo({
      y: position,
    });
  }

  handleFilterChange = (value) => {
    const filteredCountries = value === '' ? this.state.cca2List : this.fuse.search(value);

    this._listView.scrollTo({ y: 0 });

    this.setState({
      filter: value,
      dataSource: ds.cloneWithRows(filteredCountries),
    });
  }

  renderCountry(country, index) {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => this.onSelectCountry(country)}
        activeOpacity={0.99}
      >
        {this.renderCountryDetail(country)}
      </TouchableOpacity>
    );
  }

  renderLetters(letter, index) {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => this.scrollTo(letter)}
        activeOpacity={0.6}
      >
        <View style={styles.letter}>
          <Text style={styles.letterText}>{letter}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  renderCountryDetail(cca2) {
    const country = countries[cca2];
    return (
      <View style={styles.itemCountry}>
        <View style={styles.itemCountryName}>
          <Text style={styles.countryName} numberOfLines={1}>
          {cca2}
          </Text>
        </View>
      </View>
    );
  }

  render() {
    return (
      <View>
        <TouchableOpacity
          onPress={() => this.setState({ modalVisible: true })}
          activeOpacity={0.7}
        >
          {
            this.props.children ?
              this.props.children
            :
              (<View style={styles.touchFlag}>
                <Text style={styles.countryName}>
                  Select
                </Text>
              </View>)
          }
        </TouchableOpacity>
        <Modal
          visible={this.state.modalVisible}
          onRequestClose={() => this.setState({ modalVisible: false })}
        >
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              {
                this.props.closeable &&
                  <CloseButton
                    onPress={() => this.onClose()}
                  />
              }
              {
                this.props.filterable &&
                  <TextInput
                    autoFocus={this.props.autoFocusFilter}
                    autoCorrect={false}
                    placeholder={this.props.filterPlaceholder}
                    style={[styles.input, !this.props.closeable && styles.inputOnly]}
                    onChangeText={this.handleFilterChange}
                    value={this.state.filter}
                  />
              }
            </View>
            <KeyboardAvoidingView behavior="padding">
              <View style={styles.contentContainer}>
                <ListView
                  keyboardShouldPersistTaps="always"
                  enableEmptySections
                  ref={listView => this._listView = listView}
                  dataSource={this.state.dataSource}
                  renderRow={country => this.renderCountry(country)}
                  initialListSize={30}
                  pageSize={15}
                  onLayout={
                    (
                      { nativeEvent: { layout: { y: offset } } }
                    ) => this.setVisibleListHeight(offset)
                  }
                />
                <ScrollView
                  contentContainerStyle={styles.letters}
                  keyboardShouldPersistTaps="always"
                >
                  {
                    this.state.filter === '' &&
                    this.state.letters.map((letter, index) => this.renderLetters(letter, index))
                  }
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    );
  }
}
